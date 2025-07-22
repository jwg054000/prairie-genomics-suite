#!/usr/bin/env python3
"""
🧬 Prairie Genomics Suite - Interactive Web Application

A beautiful, easy-to-use web interface for genomics analysis.
No backend knowledge required - just run and use!

Author: Prairie Genomics Team
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import scipy.stats as stats
from scipy.stats import ttest_ind, false_discovery_control
import requests
import io
import base64
import time
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Configure Streamlit page
st.set_page_config(
    page_title="🧬 Prairie Genomics Suite",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        color: #2E86AB;
        text-align: center;
        margin-bottom: 2rem;
    }
    .sub-header {
        font-size: 1.5rem;
        color: #A23B72;
        margin: 1rem 0;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
    }
    .success-box {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 1rem 0;
    }
    .warning-box {
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        color: #856404;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 1rem 0;
    }
    .info-box {
        background-color: #d1ecf1;
        border: 1px solid #bee5eb;
        color: #0c5460;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)

class PrairieGenomicsWebApp:
    """
    Main application class for Prairie Genomics Suite Web App
    """
    
    def __init__(self):
        if 'analyzer_initialized' not in st.session_state:
            st.session_state.analyzer_initialized = False
        if 'expression_data' not in st.session_state:
            st.session_state.expression_data = None
        if 'clinical_data' not in st.session_state:
            st.session_state.clinical_data = None
        if 'de_results' not in st.session_state:
            st.session_state.de_results = None
        if 'gene_symbols' not in st.session_state:
            st.session_state.gene_symbols = {}
    
    def show_header(self):
        """Display the main header and navigation"""
        st.markdown('<h1 class="main-header">🧬 Prairie Genomics Suite</h1>', unsafe_allow_html=True)
        st.markdown('<p style="text-align: center; font-size: 1.2rem; color: #666;">Making genomics analysis accessible to every researcher</p>', unsafe_allow_html=True)
        
        # Navigation tabs
        tab1, tab2, tab3, tab4, tab5 = st.tabs([
            "📊 Data Upload", 
            "🔄 Gene Conversion", 
            "🧬 Analysis", 
            "📈 Visualizations", 
            "📄 Results"
        ])
        
        return tab1, tab2, tab3, tab4, tab5
    
    def load_sample_data(self):
        """Load sample TCGA data for demonstration"""
        try:
            # Try to load the existing TCGA data
            expression_path = "/content/drive/MyDrive/Colab Notebooks/prairie_tcga_pipeline/TCGA_for_josh.csv"
            clinical_path = "/content/drive/MyDrive/Colab Notebooks/prairie_tcga_pipeline/TCGA_PAAD_clinicalFormatted_match.csv"
            
            expression_data = pd.read_csv(expression_path, index_col=0)
            clinical_data = pd.read_csv(clinical_path)
            
            return expression_data, clinical_data
        except:
            return None, None
    
    def gene_conversion_section(self, tab):
        """Gene ID to symbol conversion interface"""
        with tab:
            st.markdown('<h2 class="sub-header">🔄 Gene ID Conversion</h2>', unsafe_allow_html=True)
            
            if st.session_state.expression_data is None:
                st.warning("⚠️ Please upload expression data first!")
                return
            
            st.info("Convert Ensembl gene IDs to human-readable gene symbols (like TCN1, TP53, etc.)")
            
            # Configuration options
            col1, col2 = st.columns(2)
            with col1:
                top_genes = st.number_input("Number of top genes to convert", 
                                          min_value=50, max_value=1000, value=200, step=50)
            with col2:
                batch_size = st.number_input("Batch size (smaller = more reliable)", 
                                           min_value=10, max_value=100, value=50, step=10)
            
            if st.button("🔄 Start Gene Conversion", type="primary"):
                with st.spinner("Converting gene IDs... This may take 2-3 minutes..."):
                    progress_bar = st.progress(0)
                    status_text = st.empty()
                    
                    try:
                        # Get top variable genes
                        status_text.text("Selecting top variable genes...")
                        gene_vars = st.session_state.expression_data.var(axis=1).sort_values(ascending=False)
                        top_gene_ids = gene_vars.head(top_genes).index.tolist()
                        progress_bar.progress(0.1)
                        
                        # Clean Ensembl IDs
                        status_text.text("Cleaning gene IDs...")
                        clean_ids = [gene.split('.')[0] for gene in top_gene_ids]
                        progress_bar.progress(0.2)
                        
                        # Convert in batches
                        import mygene
                        mg = mygene.MyGeneInfo()
                        all_results = []
                        
                        num_batches = len(clean_ids) // batch_size + 1
                        for i in range(0, len(clean_ids), batch_size):
                            batch_num = (i // batch_size) + 1
                            status_text.text(f"Converting batch {batch_num}/{num_batches}...")
                            
                            batch = clean_ids[i:i+batch_size]
                            try:
                                results = mg.querymany(batch, scopes='ensembl.gene', 
                                                     fields='symbol', species='human')
                                all_results.extend(results)
                                time.sleep(0.5)  # Be nice to the API
                            except Exception as e:
                                st.warning(f"Batch {batch_num} failed: {str(e)}")
                            
                            progress = 0.2 + (0.7 * batch_num / num_batches)
                            progress_bar.progress(progress)
                        
                        # Build gene symbol mapping
                        status_text.text("Building gene symbol mapping...")
                        gene_symbols = {}
                        for result in all_results:
                            if 'query' in result and 'symbol' in result:
                                gene_symbols[result['query']] = result['symbol']
                        
                        st.session_state.gene_symbols = gene_symbols
                        progress_bar.progress(1.0)
                        status_text.text("✅ Gene conversion complete!")
                        
                        # Show results
                        st.success(f"🎉 Successfully converted {len(gene_symbols)} genes!")
                        
                        # Display sample conversions
                        if gene_symbols:
                            st.subheader("📋 Sample Gene Conversions:")
                            sample_df = pd.DataFrame([
                                {"Ensembl ID": k, "Gene Symbol": v} 
                                for k, v in list(gene_symbols.items())[:10]
                            ])
                            st.dataframe(sample_df, use_container_width=True)
                            
                            # Check for TCN1
                            tcn1_found = any('TCN1' in symbol for symbol in gene_symbols.values())
                            if tcn1_found:
                                st.success("🎯 TCN1 gene found! Ready for differential expression analysis.")
                            else:
                                st.warning("⚠️ TCN1 not found in top genes. Try increasing the number of genes to convert.")
                    
                    except Exception as e:
                        st.error(f"❌ Gene conversion failed: {str(e)}")
                        st.info("💡 You can still proceed with Ensembl IDs if needed.")
            
            # Show current status
            if st.session_state.gene_symbols:
                st.markdown('<div class="success-box">', unsafe_allow_html=True)
                st.write(f"✅ **{len(st.session_state.gene_symbols)} genes converted**")
                st.write("Ready for analysis!")
                st.markdown('</div>', unsafe_allow_html=True)
    
    def data_upload_section(self, tab):
        """Data upload and preview interface"""
        with tab:
            st.markdown('<h2 class="sub-header">📊 Data Upload & Preview</h2>', unsafe_allow_html=True)
            
            # Upload options
            upload_option = st.radio(
                "Choose data source:",
                ["📁 Upload your own files", "🧬 Use sample TCGA data", "💾 Load from Google Drive path"]
            )
            
            if upload_option == "📁 Upload your own files":
                st.info("Upload your genomics data files (CSV or TSV format)")
                
                col1, col2 = st.columns(2)
                with col1:
                    st.subheader("Expression Data")
                    st.caption("Matrix with genes as rows, samples as columns")
                    expression_file = st.file_uploader(
                        "Choose expression file", 
                        type=['csv', 'tsv'],
                        key="expression_upload"
                    )
                
                with col2:
                    st.subheader("Clinical Data (Optional)")
                    st.caption("Sample metadata and clinical information")
                    clinical_file = st.file_uploader(
                        "Choose clinical file", 
                        type=['csv', 'tsv'],
                        key="clinical_upload"
                    )
                
                if st.button("📤 Load Uploaded Files") and expression_file:
                    with st.spinner("Loading your data..."):
                        try:
                            # Load expression data
                            expression_data = pd.read_csv(expression_file, index_col=0)
                            st.session_state.expression_data = expression_data
                            
                            # Load clinical data if provided
                            if clinical_file:
                                clinical_data = pd.read_csv(clinical_file)
                                st.session_state.clinical_data = clinical_data
                            
                            st.success("✅ Data loaded successfully!")
                            
                        except Exception as e:
                            st.error(f"❌ Error loading data: {str(e)}")
            
            elif upload_option == "🧬 Use sample TCGA data":
                st.info("Load the sample TCGA PAAD dataset for demonstration")
                
                if st.button("📊 Load TCGA Sample Data"):
                    with st.spinner("Loading TCGA data..."):
                        expression_data, clinical_data = self.load_sample_data()
                        
                        if expression_data is not None:
                            st.session_state.expression_data = expression_data
                            st.session_state.clinical_data = clinical_data
                            st.success("✅ TCGA sample data loaded successfully!")
                        else:
                            st.error("❌ Could not load sample data. Please upload your own files.")
            
            else:  # Google Drive path
                st.info("Load data from specific Google Drive paths")
                
                col1, col2 = st.columns(2)
                with col1:
                    expression_path = st.text_input(
                        "Expression data path:",
                        value="/content/drive/MyDrive/Colab Notebooks/prairie_tcga_pipeline/TCGA_for_josh.csv"
                    )
                with col2:
                    clinical_path = st.text_input(
                        "Clinical data path:",
                        value="/content/drive/MyDrive/Colab Notebooks/prairie_tcga_pipeline/TCGA_PAAD_clinicalFormatted_match.csv"
                    )
                
                if st.button("📂 Load from Paths"):
                    with st.spinner("Loading data from Google Drive..."):
                        try:
                            expression_data = pd.read_csv(expression_path, index_col=0)
                            clinical_data = pd.read_csv(clinical_path)
                            
                            st.session_state.expression_data = expression_data
                            st.session_state.clinical_data = clinical_data
                            
                            st.success("✅ Data loaded from Google Drive!")
                        except Exception as e:
                            st.error(f"❌ Error loading from paths: {str(e)}")
            
            # Data preview
            if st.session_state.expression_data is not None:
                st.markdown('<div class="success-box">', unsafe_allow_html=True)
                st.write("✅ **Data loaded successfully!**")
                
                # Show data info
                expr_shape = st.session_state.expression_data.shape
                st.write(f"📊 **Expression Data**: {expr_shape[0]} genes × {expr_shape[1]} samples")
                
                if st.session_state.clinical_data is not None:
                    clin_shape = st.session_state.clinical_data.shape
                    st.write(f"📋 **Clinical Data**: {clin_shape[0]} samples × {clin_shape[1]} variables")
                
                st.markdown('</div>', unsafe_allow_html=True)
                
                # Data preview tabs
                preview_tab1, preview_tab2 = st.tabs(["🔬 Expression Preview", "📋 Clinical Preview"])
                
                with preview_tab1:
                    st.subheader("Expression Data Preview")
                    st.dataframe(st.session_state.expression_data.head(10), use_container_width=True)
                    
                    # Basic statistics
                    st.subheader("📈 Data Statistics")
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("Total Genes", expr_shape[0])
                    with col2:
                        st.metric("Total Samples", expr_shape[1])
                    with col3:
                        st.metric("Mean Expression", f"{st.session_state.expression_data.values.mean():.2f}")
                    with col4:
                        st.metric("Max Expression", f"{st.session_state.expression_data.values.max():.2f}")
                
                with preview_tab2:
                    if st.session_state.clinical_data is not None:
                        st.subheader("Clinical Data Preview")
                        st.dataframe(st.session_state.clinical_data.head(10), use_container_width=True)
                        
                        # Show available columns
                        st.subheader("📋 Available Clinical Variables")
                        cols_df = pd.DataFrame({
                            "Column": st.session_state.clinical_data.columns,
                            "Non-null Count": [st.session_state.clinical_data[col].count() for col in st.session_state.clinical_data.columns],
                            "Data Type": [str(st.session_state.clinical_data[col].dtype) for col in st.session_state.clinical_data.columns]
                        })
                        st.dataframe(cols_df, use_container_width=True)
                    else:
                        st.info("No clinical data loaded")
    
    def analysis_section(self, tab):
        """Differential expression analysis interface"""
        with tab:
            st.markdown('<h2 class="sub-header">🧬 Differential Expression Analysis</h2>', unsafe_allow_html=True)
            
            if st.session_state.expression_data is None:
                st.warning("⚠️ Please upload expression data first!")
                return
            
            st.info("Compare gene expression between high and low expression groups")
            
            # Analysis parameters
            col1, col2, col3 = st.columns(3)
            with col1:
                target_gene = st.selectbox(
                    "🎯 Target gene for grouping:",
                    options=["TCN1", "TP53", "MYC", "BRCA1", "Custom"],
                    index=0
                )
                if target_gene == "Custom":
                    target_gene = st.text_input("Enter custom gene symbol:", value="TCN1")
            
            with col2:
                p_threshold = st.number_input(
                    "📊 P-value threshold:",
                    min_value=0.001, max_value=0.1, value=0.05, step=0.001, format="%.3f"
                )
            
            with col3:
                fc_threshold = st.number_input(
                    "📈 Fold change threshold:",
                    min_value=0.5, max_value=5.0, value=1.0, step=0.1, format="%.1f"
                )
            
            # Advanced options
            with st.expander("🔧 Advanced Options"):
                grouping_method = st.radio(
                    "Grouping method:",
                    ["Median split", "Quartile split (top 25% vs bottom 25%)", "Custom thresholds"]
                )
                
                if grouping_method == "Custom thresholds":
                    col1, col2 = st.columns(2)
                    with col1:
                        high_threshold = st.number_input("High expression threshold:", value=None)
                    with col2:
                        low_threshold = st.number_input("Low expression threshold:", value=None)
            
            # Run analysis
            if st.button("🚀 Run Differential Expression Analysis", type="primary"):
                with st.spinner(f"Running differential expression analysis for {target_gene}..."):
                    try:
                        progress_bar = st.progress(0)
                        status_text = st.empty()
                        
                        # Find target gene
                        status_text.text("🔍 Finding target gene...")
                        target_gene_id = self.find_target_gene(target_gene)
                        progress_bar.progress(0.2)
                        
                        if target_gene_id is None:
                            st.error(f"❌ Could not find {target_gene} in expression data")
                            return
                        
                        st.success(f"✅ Found target gene: {target_gene_id}")
                        
                        # Group samples
                        status_text.text("👥 Grouping samples...")
                        high_samples, low_samples = self.group_samples(target_gene_id, grouping_method)
                        progress_bar.progress(0.4)
                        
                        st.info(f"📊 Group sizes: {len(high_samples)} high, {len(low_samples)} low")
                        
                        # Perform differential expression
                        status_text.text("🧬 Running statistical tests...")
                        de_results = self.run_differential_expression(high_samples, low_samples)
                        progress_bar.progress(0.8)
                        
                        # Apply multiple testing correction
                        status_text.text("📊 Applying multiple testing correction...")
                        de_results['adj_p_value'] = false_discovery_control(de_results['p_value'])
                        
                        # Add significance labels
                        conditions = [
                            (de_results['adj_p_value'] < p_threshold) & (de_results['log2_fold_change'] > fc_threshold),
                            (de_results['adj_p_value'] < p_threshold) & (de_results['log2_fold_change'] < -fc_threshold),
                        ]
                        choices = ['up', 'down']
                        de_results['significance'] = np.select(conditions, choices, default='ns')
                        
                        # Sort results
                        de_results = de_results.sort_values('adj_p_value')
                        st.session_state.de_results = de_results
                        
                        progress_bar.progress(1.0)
                        status_text.text("✅ Analysis complete!")
                        
                        # Show results summary
                        sig_genes = de_results[de_results['significance'] != 'ns']
                        up_genes = len(sig_genes[sig_genes['significance'] == 'up'])
                        down_genes = len(sig_genes[sig_genes['significance'] == 'down'])
                        
                        st.success("🎉 Differential expression analysis complete!")
                        
                        # Results metrics
                        col1, col2, col3, col4 = st.columns(4)
                        with col1:
                            st.metric("📊 Total Genes", len(de_results))
                        with col2:
                            st.metric("📈 Upregulated", up_genes)
                        with col3:
                            st.metric("📉 Downregulated", down_genes)
                        with col4:
                            st.metric("🎯 Total Significant", len(sig_genes))
                        
                        # Top results preview
                        if len(sig_genes) > 0:
                            st.subheader("🔝 Top 10 Significant Genes")
                            top_results = sig_genes.head(10)[['gene_symbol', 'log2_fold_change', 'adj_p_value', 'significance']]
                            st.dataframe(top_results, use_container_width=True)
                        else:
                            st.warning("⚠️ No significantly differentially expressed genes found with current thresholds.")
                    
                    except Exception as e:
                        st.error(f"❌ Analysis failed: {str(e)}")
                        st.info("💡 Try adjusting parameters or checking your data format.")
            
            # Show current results status
            if st.session_state.de_results is not None:
                st.markdown('<div class="success-box">', unsafe_allow_html=True)
                sig_count = len(st.session_state.de_results[st.session_state.de_results['significance'] != 'ns'])
                st.write(f"✅ **Analysis Results Available**")
                st.write(f"🎯 {sig_count} significant genes found")
                st.write("Ready for visualization!")
                st.markdown('</div>', unsafe_allow_html=True)
    
    def find_target_gene(self, target_gene):
        """Find target gene ID in expression data"""
        # First try to find by gene symbol
        if st.session_state.gene_symbols:
            for gene_id, symbol in st.session_state.gene_symbols.items():
                if symbol.upper() == target_gene.upper():
                    # Find the full gene ID in expression data
                    for expr_gene_id in st.session_state.expression_data.index:
                        if gene_id in expr_gene_id:
                            return expr_gene_id
        
        # Try to find by partial match in gene ID
        for gene_id in st.session_state.expression_data.index:
            if target_gene.upper() in gene_id.upper():
                return gene_id
        
        return None
    
    def group_samples(self, target_gene_id, method):
        """Group samples based on target gene expression"""
        target_expression = st.session_state.expression_data.loc[target_gene_id]
        
        if method == "Median split":
            threshold = target_expression.median()
            high_samples = target_expression[target_expression >= threshold].index
            low_samples = target_expression[target_expression < threshold].index
        elif method == "Quartile split (top 25% vs bottom 25%)":
            q75 = target_expression.quantile(0.75)
            q25 = target_expression.quantile(0.25)
            high_samples = target_expression[target_expression >= q75].index
            low_samples = target_expression[target_expression <= q25].index
        else:  # Custom thresholds
            high_samples = target_expression[target_expression >= high_threshold].index
            low_samples = target_expression[target_expression <= low_threshold].index
        
        return high_samples, low_samples
    
    def run_differential_expression(self, high_samples, low_samples):
        """Perform differential expression analysis"""
        results = []
        
        for gene_id in st.session_state.expression_data.index:
            high_expr = st.session_state.expression_data.loc[gene_id, high_samples]
            low_expr = st.session_state.expression_data.loc[gene_id, low_samples]
            
            if len(high_expr) < 3 or len(low_expr) < 3:
                continue
            
            try:
                # Perform t-test
                stat, pval = ttest_ind(high_expr, low_expr)
                log2fc = np.log2((high_expr.mean() + 1e-6) / (low_expr.mean() + 1e-6))
                
                # Get gene symbol
                clean_id = gene_id.split('.')[0]
                symbol = st.session_state.gene_symbols.get(clean_id, clean_id)
                
                results.append({
                    'gene_id': gene_id,
                    'gene_symbol': symbol,
                    'log2_fold_change': log2fc,
                    'p_value': pval,
                    'high_mean': high_expr.mean(),
                    'low_mean': low_expr.mean(),
                    'high_std': high_expr.std(),
                    'low_std': low_expr.std()
                })
            except:
                continue
        
        return pd.DataFrame(results)
    
    def visualization_section(self, tab):
        """Interactive visualization interface"""
        with tab:
            st.markdown('<h2 class="sub-header">📈 Interactive Visualizations</h2>', unsafe_allow_html=True)
            
            if st.session_state.de_results is None:
                st.warning("⚠️ Please run differential expression analysis first!")
                return
            
            # Visualization options
            viz_type = st.selectbox(
                "🎨 Choose visualization:",
                ["🌋 Volcano Plot", "📊 PCA Plot", "🔥 Heatmap", "📈 Expression Plot"]
            )
            
            if viz_type == "🌋 Volcano Plot":
                self.create_volcano_plot()
            elif viz_type == "📊 PCA Plot":
                self.create_pca_plot()
            elif viz_type == "🔥 Heatmap":
                self.create_heatmap()
            elif viz_type == "📈 Expression Plot":
                self.create_expression_plot()
    
    def create_volcano_plot(self):
        """Create interactive volcano plot"""
        st.subheader("🌋 Interactive Volcano Plot")
        
        # Plot parameters
        col1, col2, col3 = st.columns(3)
        with col1:
            p_cutoff = st.slider("P-value cutoff", 0.001, 0.1, 0.05, step=0.001)
        with col2:
            fc_cutoff = st.slider("Fold change cutoff", 0.5, 5.0, 1.0, step=0.1)
        with col3:
            point_size = st.slider("Point size", 2, 10, 4)
        
        # Prepare data
        plot_data = st.session_state.de_results.copy()
        plot_data['-log10_p'] = -np.log10(plot_data['adj_p_value'] + 1e-300)
        
        # Color by significance
        conditions = [
            (plot_data['adj_p_value'] < p_cutoff) & (plot_data['log2_fold_change'] > fc_cutoff),
            (plot_data['adj_p_value'] < p_cutoff) & (plot_data['log2_fold_change'] < -fc_cutoff),
        ]
        choices = ['Upregulated', 'Downregulated']
        plot_data['Category'] = np.select(conditions, choices, default='Not Significant')
        
        # Create plotly figure
        fig = px.scatter(
            plot_data, 
            x='log2_fold_change', 
            y='-log10_p',
            color='Category',
            hover_data=['gene_symbol', 'adj_p_value'],
            color_discrete_map={
                'Upregulated': '#E74C3C',
                'Downregulated': '#3498DB',
                'Not Significant': '#7F7F7F'
            },
            title="Differential Expression Volcano Plot"
        )
        
        # Update traces
        fig.update_traces(marker=dict(size=point_size, opacity=0.7))
        
        # Add threshold lines
        fig.add_hline(y=-np.log10(p_cutoff), line_dash="dash", line_color="gray")
        fig.add_vline(x=fc_cutoff, line_dash="dash", line_color="gray")
        fig.add_vline(x=-fc_cutoff, line_dash="dash", line_color="gray")
        
        # Update layout
        fig.update_layout(
            xaxis_title="Log2 Fold Change",
            yaxis_title="-Log10(Adjusted P-value)",
            width=800,
            height=600,
            hovermode='closest'
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Summary statistics
        up_count = len(plot_data[plot_data['Category'] == 'Upregulated'])
        down_count = len(plot_data[plot_data['Category'] == 'Downregulated'])
        ns_count = len(plot_data[plot_data['Category'] == 'Not Significant'])
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("📈 Upregulated", up_count, help="Genes with higher expression")
        with col2:
            st.metric("📉 Downregulated", down_count, help="Genes with lower expression")
        with col3:
            st.metric("⭕ Not Significant", ns_count, help="Genes below significance thresholds")
    
    def create_pca_plot(self):
        """Create PCA plot"""
        st.subheader("📊 Principal Component Analysis")
        
        with st.spinner("Computing PCA..."):
            # Transpose data (samples as rows)
            expr_t = st.session_state.expression_data.T
            
            # Standardize
            scaler = StandardScaler()
            expr_scaled = scaler.fit_transform(expr_t)
            
            # PCA
            pca = PCA(n_components=5)
            pca_result = pca.fit_transform(expr_scaled)
            
            # Create dataframe
            pca_df = pd.DataFrame({
                'PC1': pca_result[:, 0],
                'PC2': pca_result[:, 1],
                'PC3': pca_result[:, 2],
                'Sample': expr_t.index
            })
            
            # Create plot
            fig = px.scatter(
                pca_df, 
                x='PC1', 
                y='PC2',
                hover_data=['Sample'],
                title="PCA Plot - Sample Clustering"
            )
            
            fig.update_layout(
                xaxis_title=f'PC1 ({pca.explained_variance_ratio_[0]:.1%} variance)',
                yaxis_title=f'PC2 ({pca.explained_variance_ratio_[1]:.1%} variance)',
                width=800,
                height=600
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Explained variance
            st.subheader("📊 Explained Variance")
            variance_df = pd.DataFrame({
                'Component': [f'PC{i+1}' for i in range(5)],
                'Variance Explained': pca.explained_variance_ratio_[:5] * 100
            })
            
            fig_var = px.bar(
                variance_df, 
                x='Component', 
                y='Variance Explained',
                title="Variance Explained by Principal Components"
            )
            st.plotly_chart(fig_var, use_container_width=True)
    
    def create_heatmap(self):
        """Create heatmap of top genes"""
        st.subheader("🔥 Expression Heatmap")
        
        # Parameters
        col1, col2 = st.columns(2)
        with col1:
            top_n = st.number_input("Number of top genes", 10, 100, 50)
        with col2:
            cluster_samples = st.checkbox("Cluster samples", value=True)
        
        # Get top significant genes
        sig_genes = st.session_state.de_results[st.session_state.de_results['significance'] != 'ns']
        if len(sig_genes) == 0:
            st.warning("No significant genes found for heatmap")
            return
        
        top_genes = sig_genes.head(top_n)['gene_id'].tolist()
        
        # Create heatmap data
        heatmap_data = st.session_state.expression_data.loc[top_genes]
        
        # Log transform and center
        heatmap_data = np.log2(heatmap_data + 1)
        heatmap_data = heatmap_data.subtract(heatmap_data.mean(axis=1), axis=0)
        
        # Create plotly heatmap
        fig = go.Figure(data=go.Heatmap(
            z=heatmap_data.values,
            x=heatmap_data.columns,
            y=[st.session_state.gene_symbols.get(g.split('.')[0], g.split('.')[0]) for g in heatmap_data.index],
            colorscale='RdBu_r',
            zmid=0
        ))
        
        fig.update_layout(
            title=f"Expression Heatmap - Top {top_n} Significant Genes",
            width=1000,
            height=max(400, top_n * 15),
            xaxis_title="Samples",
            yaxis_title="Genes"
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    def create_expression_plot(self):
        """Create expression plot for specific gene"""
        st.subheader("📈 Gene Expression Plot")
        
        # Gene selection
        gene_options = []
        if st.session_state.gene_symbols:
            gene_options = list(st.session_state.gene_symbols.values())
        else:
            gene_options = st.session_state.expression_data.index[:100].tolist()
        
        selected_gene = st.selectbox("Select gene to plot:", gene_options)
        
        if selected_gene:
            # Find gene ID
            gene_id = None
            if st.session_state.gene_symbols:
                for gid, symbol in st.session_state.gene_symbols.items():
                    if symbol == selected_gene:
                        for expr_id in st.session_state.expression_data.index:
                            if gid in expr_id:
                                gene_id = expr_id
                                break
                        break
            else:
                gene_id = selected_gene
            
            if gene_id:
                # Get expression data
                expr_data = st.session_state.expression_data.loc[gene_id]
                
                # Create dataframe
                plot_df = pd.DataFrame({
                    'Sample': expr_data.index,
                    'Expression': expr_data.values
                })
                
                # Box plot
                fig = px.box(plot_df, y='Expression', title=f"{selected_gene} Expression Distribution")
                st.plotly_chart(fig, use_container_width=True)
                
                # Histogram
                fig_hist = px.histogram(plot_df, x='Expression', title=f"{selected_gene} Expression Histogram")
                st.plotly_chart(fig_hist, use_container_width=True)
    
    def results_section(self, tab):
        """Results download and summary"""
        with tab:
            st.markdown('<h2 class="sub-header">📄 Results & Export</h2>', unsafe_allow_html=True)
            
            if st.session_state.de_results is None:
                st.warning("⚠️ No analysis results available!")
                return
            
            # Analysis summary
            st.subheader("📊 Analysis Summary")
            
            sig_genes = st.session_state.de_results[st.session_state.de_results['significance'] != 'ns']
            up_genes = sig_genes[sig_genes['significance'] == 'up']
            down_genes = sig_genes[sig_genes['significance'] == 'down']
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("🧬 Total Genes Tested", len(st.session_state.de_results))
            with col2:
                st.metric("🎯 Significant Genes", len(sig_genes))
            with col3:
                st.metric("📈 Upregulated", len(up_genes))
            with col4:
                st.metric("📉 Downregulated", len(down_genes))
            
            # Results tables
            st.subheader("📋 Results Tables")
            
            # All results
            with st.expander("🔍 All Results", expanded=False):
                st.dataframe(st.session_state.de_results, use_container_width=True)
            
            # Significant results
            if len(sig_genes) > 0:
                with st.expander("⭐ Significant Genes Only", expanded=True):
                    st.dataframe(sig_genes, use_container_width=True)
            
            # Download section
            st.subheader("💾 Download Results")
            
            col1, col2 = st.columns(2)
            
            with col1:
                # Download all results
                csv_all = st.session_state.de_results.to_csv(index=False)
                st.download_button(
                    label="📥 Download All Results (CSV)",
                    data=csv_all,
                    file_name=f"prairie_genomics_all_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                    mime="text/csv"
                )
            
            with col2:
                # Download significant results only
                if len(sig_genes) > 0:
                    csv_sig = sig_genes.to_csv(index=False)
                    st.download_button(
                        label="⭐ Download Significant Genes (CSV)",
                        data=csv_sig,
                        file_name=f"prairie_genomics_significant_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                        mime="text/csv"
                    )
                else:
                    st.info("No significant genes to download")
            
            # Generate report
            st.subheader("📄 Analysis Report")
            
            if st.button("📋 Generate Comprehensive Report"):
                report = self.generate_analysis_report()
                st.text_area("Analysis Report", report, height=400)
                
                st.download_button(
                    label="📄 Download Report (TXT)",
                    data=report,
                    file_name=f"prairie_genomics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
                    mime="text/plain"
                )
    
    def generate_analysis_report(self):
        """Generate a comprehensive analysis report"""
        if st.session_state.de_results is None:
            return "No analysis results available."
        
        sig_genes = st.session_state.de_results[st.session_state.de_results['significance'] != 'ns']
        up_genes = sig_genes[sig_genes['significance'] == 'up']
        down_genes = sig_genes[sig_genes['significance'] == 'down']
        
        report = f"""
🧬 PRAIRIE GENOMICS SUITE - ANALYSIS REPORT
==========================================

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

📊 DATASET SUMMARY
------------------
• Expression Data: {st.session_state.expression_data.shape[0]} genes × {st.session_state.expression_data.shape[1]} samples
• Clinical Data: {'Available' if st.session_state.clinical_data is not None else 'Not available'}
• Gene Symbols Converted: {len(st.session_state.gene_symbols)}

🧬 DIFFERENTIAL EXPRESSION RESULTS
----------------------------------
• Total genes tested: {len(st.session_state.de_results)}
• Significant genes: {len(sig_genes)}
• Upregulated genes: {len(up_genes)}
• Downregulated genes: {len(down_genes)}

📈 STATISTICAL SUMMARY
----------------------
• P-value range: {st.session_state.de_results['p_value'].min():.2e} - {st.session_state.de_results['p_value'].max():.2e}
• Fold change range: {st.session_state.de_results['log2_fold_change'].min():.2f} - {st.session_state.de_results['log2_fold_change'].max():.2f}

🔝 TOP 10 SIGNIFICANT GENES
---------------------------
"""
        
        if len(sig_genes) > 0:
            top_10 = sig_genes.head(10)
            for idx, row in top_10.iterrows():
                report += f"• {row['gene_symbol']}: FC={row['log2_fold_change']:.2f}, Adj.P={row['adj_p_value']:.2e} ({row['significance']})\n"
        else:
            report += "No significant genes found.\n"
        
        report += f"""

💡 ANALYSIS NOTES
-----------------
• Multiple testing correction: Benjamini-Hochberg FDR
• Analysis performed using Prairie Genomics Suite
• For questions or support, visit our documentation

🧬 Prairie Genomics Suite
"Making genomics analysis accessible to every researcher"
"""
        
        return report
    
    def sidebar_info(self):
        """Show information sidebar"""
        with st.sidebar:
            st.markdown("### 🧬 Prairie Genomics Suite")
            st.markdown("*Making genomics analysis accessible to every researcher*")
            
            # Progress indicator
            st.markdown("### 📋 Analysis Progress")
            
            progress_items = [
                ("📊 Data Upload", st.session_state.expression_data is not None),
                ("🔄 Gene Conversion", bool(st.session_state.gene_symbols)),
                ("🧬 DE Analysis", st.session_state.de_results is not None),
                ("📈 Visualizations", st.session_state.de_results is not None),
                ("📄 Results", st.session_state.de_results is not None)
            ]
            
            for item, completed in progress_items:
                if completed:
                    st.markdown(f"✅ {item}")
                else:
                    st.markdown(f"⏳ {item}")
            
            # Quick stats
            if st.session_state.expression_data is not None:
                st.markdown("### 📊 Quick Stats")
                st.write(f"**Genes**: {st.session_state.expression_data.shape[0]:,}")
                st.write(f"**Samples**: {st.session_state.expression_data.shape[1]:,}")
                
                if st.session_state.gene_symbols:
                    st.write(f"**Symbols**: {len(st.session_state.gene_symbols):,}")
                
                if st.session_state.de_results is not None:
                    sig_count = len(st.session_state.de_results[st.session_state.de_results['significance'] != 'ns'])
                    st.write(f"**Significant**: {sig_count:,}")
            
            # Help section
            st.markdown("### 💡 Quick Help")
            st.markdown("""
            **Getting Started:**
            1. Upload your data in the Data Upload tab
            2. Convert gene IDs to symbols
            3. Run differential expression analysis
            4. Explore your results with visualizations
            5. Download results and reports
            
            **Supported Formats:**
            - CSV files with genes as rows
            - TSV files with tab separation
            - Ensembl gene IDs supported
            
            **Need Help?**
            Check the documentation for detailed guides and tutorials.
            """)
    
    def run(self):
        """Run the main application"""
        self.sidebar_info()
        
        # Main header and tabs
        tab1, tab2, tab3, tab4, tab5 = self.show_header()
        
        # Run each section
        self.data_upload_section(tab1)
        self.gene_conversion_section(tab2)
        self.analysis_section(tab3)
        self.visualization_section(tab4)
        self.results_section(tab5)

# Run the application
if __name__ == "__main__":
    # Install required packages
    import subprocess
    import sys
    
    packages = [
        'streamlit',
        'plotly',
        'mygene',
        'gseapy',
        'scikit-learn'
    ]
    
    # Check and install packages
    for package in packages:
        try:
            __import__(package)
        except ImportError:
            print(f"Installing {package}...")
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
    
    # Initialize and run app
    app = PrairieGenomicsWebApp()
    app.run()